# Procfile — Define el comando de inicio para Render / Heroku
# Render lo usa como alternativa a render.yaml si no existe
web: gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120
