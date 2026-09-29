import os

from flask import Flask, render_template, request, url_for
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
# Behind nginx: trust X-Forwarded-Proto/Host so absolute URLs use the public https host.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# Public origin for link previews (KakaoTalk etc. need absolute og:image URLs).
# Set PUBLIC_URL in scsrun.conf; falls back to the request's host.
PUBLIC_URL = os.environ.get("PUBLIC_URL", "").rstrip("/")
# Static URLs carry a ?v=<mtime> version (see `asset` below), so browsers may
# cache them for a long time and still pick up every deploy immediately.
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 60 * 60 * 24 * 365


@app.context_processor
def asset_helper():
    def asset(filename):
        try:
            version = int(os.path.getmtime(os.path.join(app.static_folder, filename)))
        except OSError:
            version = 0
        return url_for("static", filename=filename, v=version)

    def absolute(path):
        base = PUBLIC_URL or request.url_root.rstrip("/")
        return base + path

    return {"asset": asset, "absolute": absolute}


@app.route("/")
def index():
    resp = app.make_response(render_template("index.html"))
    # The page itself must always be revalidated so it points at the newest assets.
    resp.headers["Cache-Control"] = "no-cache"
    return resp


@app.route("/healthz")
def healthz():
    return {"status": "ok"}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=15004)
