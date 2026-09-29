"""WSGI entry point: gunicorn uses `wsgi:app`, `./startup.sh dev` runs this file."""
import os

from app import app

if __name__ == "__main__":
    app.run(
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "15004")),
        debug=os.environ.get("FLASK_DEBUG") == "1",
    )
