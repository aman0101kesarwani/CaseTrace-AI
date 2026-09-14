import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { CourtCaseWithId, InitialCaseState } from "../types";
import { api, ApiCase } from "@/services/api";

function toLegacyCase(c: ApiCase): CourtCaseWithId {
  return {
    id: String(c.id),
    Nature: c.case_type || "",
    label: c.status || "ACTIVE",
    CompanyName: "",
    Year: c.created_at ? new Date(c.created_at).getFullYear() : 0,
    CaseNumber: c.case_number || `CASE-${c.id}`,
    CourtHouse: c.jurisdiction || "",
    FacilityNumber: "",
    Value: "",
    FirstDefendantName: "",
    FiledOn: c.created_at ? new Date(c.created_at).toLocaleDateString() : "",
    SupportDate: "",
    PreviousDate: "",
    PreviousStep: "",
    NextDate: "",
    NextStep: "",
    Remark: c.description || "",
  };
}

export const fetchCasesData = createAsyncThunk(
  "cases/fetchCasesData",
  async (_, { rejectWithValue }) => {
    try {
      const fetchedCases = await api.cases();
      return fetchedCases.map(toLegacyCase);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load cases";
      return rejectWithValue(message);
    }
  }
);

const initialState: InitialCaseState = {
  cases: [],
  selectedCase: null,
  isCasesDataLoading: false,
  isCasesDataError: null,
};

const caseSlice = createSlice({
  name: "caseState",
  initialState,
  reducers: {
    setCases: (state, { payload }) => { state.cases = payload; },
    setSelectedCase: (state, { payload }) => { state.selectedCase = payload; },
    clearCases: (state) => { state.cases = []; },
    clearSelectedCase: (state) => { state.selectedCase = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCasesData.pending, (state) => {
        state.isCasesDataLoading = true;
        state.isCasesDataError = null;
      })
      .addCase(fetchCasesData.fulfilled, (state, { payload }) => {
        state.isCasesDataLoading = false;
        state.cases = payload;
      })
      .addCase(fetchCasesData.rejected, (state, { payload }) => {
        state.isCasesDataLoading = false;
        state.isCasesDataError = payload as string;
      });
  },
});

export const { setCases, clearCases, setSelectedCase, clearSelectedCase } = caseSlice.actions;
export default caseSlice.reducer;
