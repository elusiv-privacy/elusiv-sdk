#!/bin/bash
source .secrets

if [[ ! -n "$ghAuth" ]]; then
  echo "Missing ghAuth token in .secrets"
  exit
fi

curl -H "Accept: application/vnd.github+json" \
-H "Authorization: Bearer $ghAuth" \
-H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/elusiv-privacy/elusiv/contents/Token.toml \
| jq -r ".content" | base64 --decode > TokenTEMP.toml

node --loader ts-node/esm scripts/tokenTomlToJson.ts TokenTEMP.toml src/public/tokenTypes/Token.ts
rm TokenTEMP.toml
