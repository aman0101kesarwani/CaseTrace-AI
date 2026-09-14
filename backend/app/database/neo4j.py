from neo4j import GraphDatabase

from app.config import settings


driver = GraphDatabase.driver(
    settings.neo4j_uri,
    auth=(
        settings.neo4j_username,
        settings.neo4j_password,
    ),
)


def get_neo4j_driver():
    return driver


def close_neo4j_driver():
    driver.close()