from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models import Case
from app.schemas.case import CaseCreate, CaseResponse, CaseUpdate
from app.auth_dependencies import get_current_user

router = APIRouter(
    prefix="/cases",
    tags=["Cases"],
    dependencies=[Depends(get_current_user)],
)

@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(payload: CaseCreate, db: Session = Depends(get_db)):
    case = Case(**payload.model_dump())
    db.add(case)
    db.commit()
    db.refresh(case)
    return case

@router.get("", response_model=list[CaseResponse])
def list_cases(db: Session = Depends(get_db)):
    return list(db.scalars(select(Case).order_by(Case.created_at.desc())).all())

@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.put("/{case_id}", response_model=CaseResponse)
def update_case(case_id: int, payload: CaseUpdate, db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(case, key, value)
    db.commit()
    db.refresh(case)
    return case

@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(case_id: int, db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    db.delete(case)
    db.commit()
