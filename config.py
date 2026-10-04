import os

class Config:

    SECRET_KEY = "sparkcheck_secret_key"

    DB_HOST = "localhost"
    DB_PORT = 3306
    DB_NAME = "sparkcheck"
    DB_USER = "root"
    DB_PASSWORD = ""

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SESSION_PERMANENT = False
    SESSION_TYPE = "filesystem"