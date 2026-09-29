import os

from flask import Flask, render_template, url_for

app = Flask(__name__)
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

    return {"asset": asset}


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
