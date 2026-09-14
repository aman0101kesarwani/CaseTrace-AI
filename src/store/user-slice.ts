import { createSlice } from "@reduxjs/toolkit";

import { InitialUsersState } from "../types";

const initialState: InitialUsersState = {
  users: [],
  loggedInUser: null,
  selectedUser: null,
  isUsersDataLoading: false,
  isUsersDataError: null,
};

const userSlice = createSlice({
  name: "userState",
  initialState,
  reducers: {
    setUsers: (state, { payload }) => {
      state.users = payload;
    },

    setLoggedInUser: (state, { payload }) => {
      state.loggedInUser = payload;
    },

    setSelectedUser: (state, { payload }) => {
      state.selectedUser = payload;
    },

    clearUsers: (state) => {
      state.users = [];
    },

    logoutUser: (state) => {
      state.loggedInUser = null;
    },

    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
  },
});

export const {
  setUsers,
  setLoggedInUser,
  clearUsers,
  logoutUser,
  setSelectedUser,
  clearSelectedUser,
} = userSlice.actions;

export default userSlice.reducer;