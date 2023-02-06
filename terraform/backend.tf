terraform {
  backend "s3" {
    # access_key, secret_key, endpoint are configured outside
    bucket = "terraform-backends"
    key    = "yontriggers.tfstate"
    # https://developers.cloudflare.com/r2/platform/s3-compatibility/api/#bucket-region
    region = "auto"
    # skip checks that don't work in CloudFlare R2
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_metadata_api_check     = true
  }
}
