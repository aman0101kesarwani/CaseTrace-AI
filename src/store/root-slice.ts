import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { InitialRootState } from "../types";
import { api } from "@/services/api";

export const fetchDashboardData = createAsyncThunk(
  "dashboard/fetchDashboardData",
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.dashboardStats();
      return {
        totalCompanies: 0,
        totalCases: data.total_cases,
        totalOngoingCases: data.total_ongoing_cases,
        totalUsers: data.total_users,
        totalOngoingCasesData: [],
        casesCountByLabel: data.cases_count_by_type,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to load dashboard");
    }
  }
);

const initialState: InitialRootState = {
  totalCompanies: 0, totalCases: 0, totalOngoingCases: 0, totalUsers: 0,
  totalOngoingCasesData: [], casesCountByLabel: {}, isDashboardDataLoading: false, isDashboardDataError: null,
};

const rootSlice = createSlice({
  name: "rootState", initialState,
  reducers: {
    setStats: (state, { payload }) => Object.assign(state, payload),
  },
  extraReducers: builder => {
    builder.addCase(fetchDashboardData.pending, state => { state.isDashboardDataLoading = true; state.isDashboardDataError = null; })
      .addCase(fetchDashboardData.fulfilled, (state, { payload }) => { state.isDashboardDataLoading = false; Object.assign(state, payload); })
      .addCase(fetchDashboardData.rejected, (state, { payload }) => { state.isDashboardDataLoading = false; state.isDashboardDataError = payload as string; });
  },
});

export const { setStats } = rootSlice.actions;
export default rootSlice.reducer;
