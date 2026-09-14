import React from "react";

import * as XLSX from "xlsx";

import { Button } from "../atoms/button";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../atoms/dialog";

import { CourtCase } from "@/types";
import { cleanString } from "@/utils";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAppDispatch } from "@/store/store";
import { Input } from "@/atoms/input";
import { fetchCasesData } from "@/store/case-slice";
import { api } from "@/services/api";

type IProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const ImportFileModal = ({ isOpen, onClose }: IProps) => {
  const dispatch = useAppDispatch();

  const [courtCases, setCourtCases] = React.useState<CourtCase[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      const binaryStr = event.target?.result as string;

      const workbook = XLSX.read(binaryStr, {
        type: "binary",
      });

      // Use the first worksheet.
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert worksheet into JSON rows.
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log("Raw Data:", data);

      // Find headers without depending on exact capitalization.
      const findHeader = (
        row: any,
        expectedHeader: string
      ): string | undefined => {
        return Object.keys(row).find(
          (key) =>
            cleanString(key).toLowerCase() ===
            expectedHeader.toLowerCase()
        );
      };

      // Convert spreadsheet rows into the existing CourtCase format.
      const cases: CourtCase[] = (data as any[]).map((row) => ({
        Nature: cleanString(
          row[findHeader(row, "Nature") ?? ""]
        ),

        label: cleanString(
          row[findHeader(row, "label") ?? ""]
        ),

        CompanyName: cleanString(
          row[findHeader(row, "Company Name") ?? ""]
        ),

        Year:
          row[findHeader(row, "Year") ?? ""] || 0,

        CaseNumber: cleanString(
          row[findHeader(row, "Case Number") ?? ""]
        ),

        CourtHouse: cleanString(
          row[findHeader(row, "Court House") ?? ""]
        ),

        FacilityNumber: cleanString(
          row[findHeader(row, "Facility Number") ?? ""]
        ),

        Value: cleanString(
          row[findHeader(row, "Value (Rs.)") ?? ""]
        ),

        FirstDefendantName: cleanString(
          row[
          findHeader(
            row,
            "1st Defendant Name -Principal Borrower"
          ) ?? ""
          ]
        ),

        FiledOn: cleanString(
          row[findHeader(row, "Filed On") ?? ""]
        ),

        SupportDate: cleanString(
          row[findHeader(row, "Support Date") ?? ""]
        ),

        PreviousDate: cleanString(
          row[findHeader(row, "Previous Date") ?? ""]
        ),

        PreviousStep: cleanString(
          row[findHeader(row, "Previous Step") ?? ""]
        ),

        NextDate: cleanString(
          row[findHeader(row, "Next Date") ?? ""]
        ),

        NextStep: cleanString(
          row[findHeader(row, "Next Step") ?? ""]
        ),

        Remark: cleanString(
          row[findHeader(row, "Remark") ?? ""]
        ),
      }));

      setCourtCases(cases);

      console.log("Final Output:", cases);
    };

    reader.readAsBinaryString(file);
  };

  const handleSubmit = async () => {
    if (courtCases.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to import",
        description: "Please select an Excel file containing case data.",
        duration: 2000,
      });

      return;
    }

    setIsUploading(true);

    try {
      toast({
        title: "Uploading cases...",
        description: format(
          new Date(),
          "EEEE, MMMM do, yyyy 'at' h:mm a"
        ),
        duration: 6000,
      });

      /*
       * The old application wrote each row directly to Firebase.
       *
       * CaseFlow AI now uses the FastAPI backend.
       *
       * Each spreadsheet row is converted into the CaseFlow API's
       * CaseCreate format and sent through api.createCase().
       */
      await Promise.all(
        courtCases.map((item: CourtCase) =>
          api.createCase({
            title:
              item.CaseNumber ||
              item.CompanyName ||
              "Imported Case",

            description: item.Remark || "",

            case_type: item.Nature || "Unclassified",

            jurisdiction: item.CourtHouse || "",

            case_number: item.CaseNumber || "",

            status: "ACTIVE",
          })
        )
      );

      toast({
        title: "Cases successfully imported.",
        description: format(
          new Date(),
          "EEEE, MMMM do, yyyy 'at' h:mm a"
        ),
        duration: 1500,
      });

      // Refresh cases from FastAPI.
      await dispatch(fetchCasesData());

      setCourtCases([]);

      onClose();
    } catch (error) {
      console.error("Error importing cases:", error);

      toast({
        variant: "destructive",
        title: "Sorry, an error occurred!",
        description:
          error instanceof Error
            ? error.message
            : `Error: ${error}`,
        duration: 3000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md xl:max-w-fit">
        <DialogHeader>
          <DialogTitle>Import Files</DialogTitle>

          <DialogDescription>
            Easily upload and manage your data by importing files
            directly into the system for seamless processing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid w-full max-w-md items-center gap-1.5">
          <Input
            id="file"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </div>

        {courtCases.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {courtCases.length} case
            {courtCases.length !== 1 ? "s" : ""} ready to import.
          </p>
        )}

        <DialogFooter className="sm:justify-start">
          <Button
            type="submit"
            variant="default"
            className="ml-auto bg-blue-800 hover:bg-blue-700"
            onClick={handleSubmit}
            disabled={isUploading || courtCases.length === 0}
          >
            {isUploading ? "Importing..." : "Import"}
          </Button>

          <DialogClose asChild>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isUploading}
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};