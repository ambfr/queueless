from flask import Flask
from flask_cors import CORS
from .config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, origins=[app.config["FRONTEND_URL"]])

    from .routes.health import bp as health_bp
    app.register_blueprint(health_bp, url_prefix="/api")

    from .routes.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    from .routes.businesses import bp as biz_bp
    app.register_blueprint(biz_bp, url_prefix="/api/businesses")

    from .routes.catalog import bp as catalog_bp
    app.register_blueprint(catalog_bp, url_prefix="/api")

    from .routes.tokens import bp as tokens_bp
    app.register_blueprint(tokens_bp, url_prefix="/api")
    return app