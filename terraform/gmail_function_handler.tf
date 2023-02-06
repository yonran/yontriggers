resource "google_storage_bucket" "bucket" {
  name     = "yontriggers"
  location = "US"
}
resource "google_pubsub_topic" "topic" {
  name = "gmail-function"
  labels = {
  }
}

resource "google_storage_bucket_object" "source" {
  # vary the object name every time the contents change
  # to force the function to be updated
  # https://github.com/hashicorp/terraform-provider-google/issues/1938#issuecomment-1215035684
  name   = "index-${filesha256("../dist/index.zip")}.zip"
  bucket = google_storage_bucket.bucket.name
  source = "../dist/index.zip"
}


resource "google_service_account" "account" {
  account_id   = "gmail-handler-account"
  display_name = "Service account used for the cloudfunctions v2 function gmail"
}

# who is allowed to 
# resource "google_service_account_iam_policy" "account" {
#   service_account_id = google_service_account.account.name
#   policy_data        = data.google_iam_policy.function.policy_data
# }
data "google_iam_policy" "function" {
  binding {
    role = "roles/iam.serviceAccountUser"

    members = [
    ]
  }
}



resource "google_cloudfunctions2_function" "function" {
  name        = "gcf-function"
  location    = "us-central1"
  description = "a new function"

  build_config {
    runtime     = "nodejs18"
    entry_point = "oauthHandler" # Set the entry point 
    environment_variables = {
    }
    source {
      storage_source {
        bucket = google_storage_bucket.bucket.name
        object = google_storage_bucket_object.source.name
      }
    }
  }

  service_config {
    max_instance_count = 100
    min_instance_count = 0
    # minimum availableMemory is 128MiB
    # https://cloud.google.com/functions/pricing#compute_time
    available_memory = "256Mi"
    timeout_seconds  = 60
    # number of concurrent requests that one instance can handle
    # https://cloud.google.com/functions/docs/configuring/concurrency
    # Total cpu < 1 is not supported with concurrency > 1.
    max_instance_request_concurrency = 1
    environment_variables = {
      SERVICE_CONFIG_TEST = "config_test"
    }
    secret_environment_variables {
      key        = "SECRET"
      project_id = google_secret_manager_secret.secret.project
      secret     = google_secret_manager_secret.secret.secret_id
      version    = "latest"
    }
    # allow requests from public internet
    ingress_settings               = "ALLOW_ALL"
    all_traffic_on_latest_revision = true
    # use custom account instead of PROJECTNUM-compute@developer.gserviceaccount.com
    service_account_email = google_service_account.account.email
  }

  # event_trigger {
  #   trigger_region = "us-central1"
  #   event_type = "google.cloud.pubsub.topic.v1.messagePublished"
  #   pubsub_topic = google_pubsub_topic.topic.id
  #   retry_policy = "RETRY_POLICY_RETRY"
  # }
  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudrun,
    google_project_service.artifactregistry,
    google_project_service.cloudbuild,

  ]
}

# allow public access; otherwise all requests return 403
# https://cloud.google.com/run/docs/authenticating/public
data "google_iam_policy" "admin" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers",
    ]
  }
}

resource "google_cloud_run_service_iam_policy" "policy" {
  location    = google_cloudfunctions2_function.function.location
  project     = google_cloudfunctions2_function.function.project
  service     = google_cloudfunctions2_function.function.name
  policy_data = data.google_iam_policy.admin.policy_data
}


resource "google_secret_manager_secret" "secret" {
  secret_id = "secret"

  labels = {
    label = "my-label"
  }

  replication {
    automatic = true
  }
}
data "google_iam_policy" "secret" {
  binding {
    role = "roles/secretmanager.secretAccessor"
    members = [
      "serviceAccount:${google_service_account.account.email}",
    ]
  }
}
resource "google_secret_manager_secret_iam_policy" "policy" {
  project     = google_secret_manager_secret.secret.project
  secret_id   = google_secret_manager_secret.secret.secret_id
  policy_data = data.google_iam_policy.secret.policy_data
}
# instead of creating this secret, we upload it manually:
# gcloud secrets versions access --secret=secret --project=yontriggers latest | \
# jq \
#   --arg client_id "$TF_VAR_google_oauth_client_id" \
#   --arg client_secret "$TF_VAR_google_oauth_client_secret" \
#   --arg new_session_secret "$(node -e "(async () => console.log(JSON.stringify(await crypto.webcrypto.subtle.exportKey('jwk', (await crypto.webcrypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-384'}, true, ['sign', 'verify'])).privateKey))))()")" \
#   '{
#     client_id: $client_id,
#     client_secret: $client_secret,
#     session_secret: (.session_secret // {keys: [($new_session_secret | fromjson | .kid = (now | todate))]})
#   }' \
#   | gcloud secrets versions add --project=yontriggers secret --data-file=-
# gcloud secrets versions delete --project=yontriggers secret --version=1
# gcloud secrets versions destroy --project=yontriggers --secret=secret 1
# resource "google_secret_manager_secret_version" "secret" {
#   secret = google_secret_manager_secret.secret.id
#   secret_data = jsonencode({
#     client_id = var.google_oauth_client_id
#     client_secret = var.google_oauth_client_secret
#   })
# }
