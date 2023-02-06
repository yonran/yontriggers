import * as esbuild from 'esbuild'
import { createWriteStream, readFileSync, write } from 'fs';
import path from 'path';
import { finished } from 'stream/promises';
import * as yazl from 'yazl'
import  {mkdirp} from 'mkdirp'

/** A Date where all the local time methods return UTC times
 *
 * The purpose of using a fixed date is to ensure that
 * the dates in the zip file are constant
 * so that the build is repeatable
 *
 * yazl uses local zone getFullYear, getMonth, getDate, getHour, etc.
 * https://github.com/thejoshwolfe/yazl/blob/2.5.1/index.js#L624-L636
 * so to make the build repeatable regardless of zone
 * (and to encode the zero DOS date exactly),
 * we need an object that returns consistent values
 * for those local zoned methods.
 */
 class UtcLocalDate extends Date {
    // The minimum time that can be stored in a Zip file, 1980-01-01
    static ZERO_DOS_DATE = new UtcLocalDate(Date.UTC(1980, 0, 1));

    /**
      * @override
      */
    getFullYear() {
        return this.getUTCFullYear();
    }

    /**
      * @override
      */
    getMonth() {
        return this.getUTCMonth();
    }

    /**
      * @override
      */
    getDate() {
        return this.getUTCDate();
    }

    /**
      * @override
      */
    getDay() {
        return this.getUTCDay();
    }

    /**
      * @override
      */
    getHours() {
        return this.getUTCHours();
    }

    /**
      * @override
      */
    getMinutes() {
        return this.getUTCMinutes();
    }

    /**
      * @override
      */
    getSeconds() {
        return this.getUTCSeconds();
    }

    // not used by yazl
    /**
      * @override
      */
    getMilliseconds() {
        return this.getUTCMilliseconds();
    }

    /**
      * @override
      */
    getTimezoneOffset() {
        return 0;
    }
}

/**
 * @param {{outFile: string}}
 * @return {esbuild.Plugin}
 */
const compress = ({outFile}) => ({
    name: 'compress',
    /**
     * @param {esbuild.PluginBuild} build
     * @return {Promise<void>}
     */
    setup: async function (build) {
        await mkdirp(path.dirname(outFile))
        if (build.initialOptions.write) {
            throw new Error('write option must be false so that onEnd has access to outputFiles')
        }
        build.onEnd(async result => {
            const outFiles = [...(result.outputFiles ?? [])]
            // not sure if files are already sorted
            outFiles.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
            const zipFile = new yazl.ZipFile()
            const writeStream = createWriteStream(outFile)
            zipFile.outputStream.pipe(writeStream)
            for (const outFile of outFiles) {
                const relativePath = path.relative(process.cwd(), outFile.path)
                zipFile.addBuffer(Buffer.from(outFile.contents), relativePath, {mtime: UtcLocalDate.ZERO_DOS_DATE})
            }
            zipFile.addFile('package.json', 'package.json')
            zipFile.end();
            await finished(writeStream)
            return {errors: result.errors, warnings: result.warnings}
        })
    }
})

/**
 * copied from https://github.com/evanw/esbuild/issues/859#issuecomment-1335102284
 * @type {esbuild.Plugin}
 */
const dirnamePlugin = {
  name: "dirname",
  setup(build) {
    const nodeModules = new RegExp(
        /^(?:.*[\\/])?node_modules(?:\/(?!postgres-migrations).*)?$/
      );
    build.onLoad({ filter: /.*/ }, ({ path: filePath }) => {
      if (!filePath.match(nodeModules)) {
        let contents = readFileSync(filePath, "utf8");
        const loader = path.extname(filePath).substring(1);
        const dirname = path.dirname(filePath);
        contents = contents
          .replaceAll("__dirname", `"${dirname}"`)
          .replaceAll("__filename", `"${filePath}"`);
        return {
          contents,
          loader,
        };
      }
    });
  },
};


/**
 * @type {import('esbuild').BuildOptions}
 */
const buildOptions = {
    entryPoints: ['src/index.ts'],
    // format: 'esm',
    format: 'cjs',
    target: 'esnext',
    bundle: true,
    platform: 'node',
    // disabled since we are not longer using format: esm
    // banner: {
    //     // fix Error: Dynamic require of "child_process" is not supported
    //     // https://github.com/evanw/esbuild/pull/2067#issuecomment-1317985898
    //     js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
    // },
    sourcemap: 'linked',
    external: [
      // this must be external to avoid
      // TypeError: functionModule.hasOwnProperty is not a function
      // when debugging with functions-framework or when deployed
      '@google-cloud/functions-framework'
    ],
    outfile: 'dist/index.js',
    write: false,
    plugins: [
        compress({outFile: 'dist/index.zip'}),
        // fix Detailed stack trace: ReferenceError: __dirname is not defined in ES module scope
        // disabled since we are not longer using format: esm
        // dirnamePlugin,
    ],
}

await esbuild.build(buildOptions)
