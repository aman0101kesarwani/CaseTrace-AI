import { Button } from "@/atoms/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/atoms/dialog";
import { Input } from "@/atoms/input";
import { Label } from "@/atoms/label";
import { MODAL_TYPE } from "@/enums";
import { toast } from "@/hooks/use-toast";
import { fetchCasesData } from "@/store/case-slice";
import { useAppDispatch } from "@/store/store";
import { api } from "@/services/api";
import { useEffect, useState } from "react";

type IProps = { isOpen: boolean; data?: any; type?: MODAL_TYPE; onClose: () => void };

export const AddCaseModal = ({ isOpen, data, type, onClose }: IProps) => {
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [caseType, setCaseType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(data?.title || data?.CaseNumber || "");
    setDescription(data?.description || data?.Remark || "");
    setCaseType(data?.case_type || data?.Nature || "");
    setJurisdiction(data?.jurisdiction || data?.CourtHouse || "");
    setCaseNumber(data?.case_number || data?.CaseNumber || "");
  }, [data, isOpen]);

  const handleSave = async () => {
    if (!title.trim()) return toast({ variant: "destructive", title: "Case title is required" });
    setSaving(true);
    try {
      const payload = { title, description, case_type: caseType, jurisdiction, case_number: caseNumber };
      if (type === MODAL_TYPE.EDIT && data?.id) await api.updateCase(Number(data.id), payload);
      else await api.createCase(payload);
      await dispatch(fetchCasesData()).unwrap();
      toast({ title: type === MODAL_TYPE.EDIT ? "Case updated successfully" : "Case created successfully" });
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "Could not save case", description: error instanceof Error ? error.message : "Unknown error" });
    } finally { setSaving(false); }
  };

  return <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{type === MODAL_TYPE.EDIT ? "Edit Case" : "Create Case"}</DialogTitle>
        <DialogDescription>Case data is now stored through the CaseFlow AI FastAPI backend.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <div><Label htmlFor="case-title">Case title</Label><Input id="case-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. State v. Rahul Sharma" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="case-number">Case number</Label><Input id="case-number" value={caseNumber} onChange={e => setCaseNumber(e.target.value)} placeholder="CASE-2026-001" /></div>
          <div><Label htmlFor="case-type">Case type</Label><Input id="case-type" value={caseType} onChange={e => setCaseType(e.target.value)} placeholder="Criminal / Civil" /></div>
        </div>
        <div><Label htmlFor="jurisdiction">Court / Jurisdiction</Label><Input id="jurisdiction" value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} placeholder="District Court" /></div>
        <div><Label htmlFor="description">Description</Label><textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short case description" className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Case"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
};
