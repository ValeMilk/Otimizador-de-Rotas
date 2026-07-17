#!/bin/bash

# Convert CSV to multipart form data and send to API
echo "Testing allocation API..."

curl -X POST \
  -F "file=@f:\\Otimizador de Rotas\\ejemplo_clientes.csv" \
  -F "workingHours[0]=480" \
  -F "workingHours[1]=480" \
  -F "workingHours[2]=480" \
  -F "workingHours[3]=480" \
  -F "workingHours[4]=480" \
  -F "workingHours[5]=240" \
  http://localhost:3008/api/debug-export \
  -H "Content-Type: multipart/form-data" \
  -v
