terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 3.33.1"
    }
    google = {
      source  = "hashicorp/google"
      version = "4.51.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "4.51.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
  # account_id is considered deprecated, but as of 3.20.0
  # it is still required in the provider
  # for cloudflare_worker_script
  account_id = var.account_id
}

provider "google" {
  project = var.google_project_name
}
provider "google-beta" {
  project = var.google_project_name
  # without billing_project,
  # creating google_firebase_project fails with
  # “Error: Error creating Project: googleapi:
  # Error 403: Your application has authenticated using end user credentials from the Google Cloud SDK or Google Cloud Shell which are not supported by the firebase.googleapis.com.
  # We recommend configuring the billing/quota_project setting in gcloud or using a service account through the auth/impersonate_service_account setting. For more information about service accounts and how to use them in your application, see https://cloud.google.com/docs/authentication/. If you are getting this error with curl or similar tools, you may need to specify 'X-Goog-User-Project' HTTP header for quota and billing purposes.
  # For more information regarding 'X-Goog-User-Project' header, please check https://cloud.google.com/apis/docs/system-parameters.”
  # https://github.com/hashicorp/terraform-provider-google/issues/13120#issuecomment-1331587267
  # https://github.com/hashicorp/terraform-provider-google/blob/d84f3bf1bf097df43d22bf1274126b8b4cb39f9e/google/config.go#L488
  user_project_override = true
  # billing_project = var.google_billing_project_name
  billing_project = var.google_project_name
}
