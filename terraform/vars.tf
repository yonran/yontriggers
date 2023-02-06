variable "account_id" {
  type      = string
  sensitive = true
}
variable "backend_access_key_id" {
  type = string
}
variable "backend_secret_access_key" {
  type      = string
  sensitive = true
}
variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}
variable "google_project_name" {
  type = string
}
variable "google_billing_project_name" {
  type = string
}
variable "google_oauth_client_id" {
  type = string
}
variable "google_oauth_client_secret" {
  type      = string
  sensitive = true
}

locals {
  zone_name      = "yonathan.org"
  main_subdomain = "blog.${local.zone_name}"
  bucket_name    = "yonathan-static-files"
}