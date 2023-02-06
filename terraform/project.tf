data "google_project" "project" {
}

resource "google_project_service" "cloudfunctions" {
  project = var.google_project_name
  service = "cloudfunctions.googleapis.com"
}
resource "google_project_service" "cloudrun" {
  project = var.google_project_name
  service = "run.googleapis.com"
}
resource "google_project_service" "artifactregistry" {
  project = var.google_project_name
  service = "artifactregistry.googleapis.com"
}
resource "google_project_service" "cloudbuild" {
  project = var.google_project_name
  service = "cloudbuild.googleapis.com"
}
resource "google_project_service" "secretmanager" {
  project = var.google_project_name
  service = "secretmanager.googleapis.com"
}
resource "google_project_service" "firebase" {
  project = var.google_project_name
  service = "firebase.googleapis.com"
}
resource "google_project_service" "firestore" {
  project = var.google_project_name
  service = "firestore.googleapis.com"
}

resource "google_project_iam_policy" "project" {
  project     = var.google_project_name
  policy_data = data.google_iam_policy.project.policy_data
}

data "google_iam_policy" "project" {
  binding {
    role = "roles/datastore.user"
    members = [
      "serviceAccount:${google_service_account.account.email}",
    ]
  }
  # copied from default
  binding {
    role = "roles/cloudfunctions.serviceAgent"
    members = [
      "serviceAccount:service-${data.google_project.project.number}@gcf-admin-robot.iam.gserviceaccount.com",
    ]
  }
  # copied from default
  binding {
    role = "roles/editor"
    members = [
      "serviceAccount:${data.google_project.project.name}@appspot.gserviceaccount.com",
      # created when you enable something I think
      "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com",
    ]
  }

  # copied from default
  binding {
    role = "roles/pubsub.serviceAgent"
    members = [
      "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com",
    ]
  }
  binding {
    role = "roles/run.serviceAgent"
    members = [
      # created when you enable run service
      "serviceAccount:service-${data.google_project.project.number}@serverless-robot-prod.iam.gserviceaccount.com",
    ]
  }
  binding {
    role = "roles/containerregistry.ServiceAgent"
    members = [
      # created when you enable run service
      "serviceAccount:service-${data.google_project.project.number}@containerregistry.iam.gserviceaccount.com",
    ]
  }
  binding {
    role = "roles/artifactregistry.serviceAgent"
    members = [
      # created when you enable artifactregistry service
      "serviceAccount:service-${data.google_project.project.number}@gcp-sa-artifactregistry.iam.gserviceaccount.com",
    ]
  }
  binding {
    role = "roles/cloudbuild.builds.builder"
    members = [
      # created when you enable cloudbuild service
      "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com",
    ]
  }
  binding {
    role = "roles/cloudbuild.serviceAgent"
    members = [
      # created when you enable cloudbuild service
      "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudbuild.iam.gserviceaccount.com",
    ]
  }
  binding {
    role = "roles/firebaserules.system"
    members = [
      # created when you create a google_firebase_project
      "serviceAccount:service-${data.google_project.project.number}@firebase-rules.iam.gserviceaccount.com",
    ]
  }
  binding {
    role = "roles/firestore.serviceAgent"
    members = [
      # created when you create a google_firebase_project
      "serviceAccount:service-${data.google_project.project.number}@gcp-sa-firestore.iam.gserviceaccount.com",
    ]
  }
  binding {
    role = "roles/owner"

    members = [
      "user:yonathan@gmail.com",
    ]
  }
}

# a firebase project within the google project is required to use firestore
# https://firebase.google.com/docs/firestore/quickstart
# currently it is still required to be beta in terraform
# resource "google_firebase_project" "project" {
#     provider = google-beta
#     project = data.google_project.project.project_id
#     depends_on = [
#         # need to enable firebase first, or else creating this gives error
#         # Error creating Project: googleapi: Error 403: Firebase Management API has not been used in project 479113547633 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/firebase.googleapis.com/overview?project=479113547633 then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.
#         google_project_service.firebase
#     ]
# }
# resource "google_app_engine_application" "firestore-config" {
#     project = data.google_project.project.project_id
#     location_id = "us-central"
#     database_type = "CLOUD_FIRESTORE"
# }
