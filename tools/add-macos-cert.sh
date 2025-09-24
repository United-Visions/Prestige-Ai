#!/usr/bin/env bash
set -eo pipefail

KEY_CHAIN=build.keychain
MACOS_CERT_P12_FILE=certificate.p12

if [ -n "$MACOS_CERT_P12" ]; then
  variable_length=${#MACOS_CERT_P12}
  echo "MACOS_CERT_P12 is set. Length: $variable_length"
else
  echo "MACOS_CERT_P12 is not set."
fi

echo -n "$MACOS_CERT_P12" | base64 -d > "$MACOS_CERT_P12_FILE"
file_size=$(stat -f%z "$MACOS_CERT_P12_FILE")
echo "Certificate size is $file_size bytes"

security create-keychain -p actions $KEY_CHAIN
security default-keychain -s $KEY_CHAIN
security unlock-keychain -p actions $KEY_CHAIN

curl https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer -o DeveloperIDG2CA.cer
sudo security add-trusted-cert -d -r unspecified -k $KEY_CHAIN DeveloperIDG2CA.cer
rm -f DeveloperIDG2CA.cer

security import $MACOS_CERT_P12_FILE -k $KEY_CHAIN -P "$MACOS_CERT_PASSWORD" -T /usr/bin/codesign;

security set-key-partition-list -S apple-tool:,apple: -s -k actions $KEY_CHAIN

security find-identity

rm -fr *.p12
