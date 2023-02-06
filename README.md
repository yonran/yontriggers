# Manual Setup

Accessing a user’s Gmail mailbox requires creating an OAuth 2.0 Client ID ([gmail quickstart nodejs](https://developers.google.com/gmail/api/quickstart/nodejs)). Work through the Consent Screen wizard:

* Create an OAuth a consent screen (https://console.cloud.google.com/apis/credentials/consent/edit)
* Scopes: add https://www.googleapis.com/auth/gmail.modify ([gmail scopes](https://developers.google.com/gmail/api/auth/scopes))
* Test users: add own gmail address


Then create an OAuth 2.0 Client ID at https://console.cloud.google.com/apis/credentials

* Authorized redirect URIs: add `https://<function_domain>/oauth2code` and possibly `http://localhost:8080/oauth2code`


Enable the relevant apis
* [cloudfunctions](https://console.developers.google.com/apis/api/cloudfunctions.googleapis.com/overview)
