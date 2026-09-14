from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth_dependencies import get_current_user
from app.database.connection import get_db
from app.database.neo4j import get_neo4j_driver

router = APIRouter(
    prefix="/api/graph",
    tags=["Knowledge Graph"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/{case_id}")
def get_case_graph(
    case_id: int,
    db: Session = Depends(get_db),
):
    """
    Return the Neo4j knowledge graph for a case.

    The graph contains nodes and relationships synchronized
    from PostgreSQL.
    """

    # Verify that the case exists in PostgreSQL.
    from app.models import Case

    case = db.get(Case, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    driver = get_neo4j_driver()

    with driver.session() as session:
        result = session.run(
            """
            MATCH (n)
            WHERE n.case_id = $case_id

            OPTIONAL MATCH (n)-[r]->(m)
            WHERE m.case_id = $case_id

            RETURN
                collect(
                    DISTINCT {
                        id: elementId(n),
                        postgres_id: n.postgres_id,
                        labels: labels(n),
                        properties: properties(n)
                    }
                ) AS nodes,

                collect(
                    DISTINCT CASE
                        WHEN r IS NOT NULL
                        THEN {
                            id: elementId(r),
                            type: type(r),
                            source: elementId(startNode(r)),
                            target: elementId(endNode(r)),
                            postgres_id: r.postgres_id,
                            properties: properties(r)
                        }
                    END
                ) AS relationships
            """,
            case_id=case_id,
        )

        record = result.single()

    if not record:
        return {
            "case_id": case_id,
            "nodes": [],
            "relationships": [],
        }

    relationships = [
        relationship
        for relationship in record["relationships"]
        if relationship is not None
    ]

    return {
        "case_id": case_id,
        "nodes": record["nodes"],
        "relationships": relationships,
    }