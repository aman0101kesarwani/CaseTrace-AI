import React, { useEffect } from "react";

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

import { Input } from "@/atoms/input";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/atoms/dropdown-menu";

import { MODAL_TYPE, USER_ROLE } from "@/enums";
import { companies } from "@/data/data";
import { formatName } from "@/utils";
import { InitialUserState } from "@/types";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { api } from "@/services/api";

type IProps = {
  isOpen: boolean;
  data?: InitialUserState;
  type?: MODAL_TYPE;
  onClose: () => void;
};

export const AddUserModal = ({
  isOpen,
  data,
  type,
  onClose,
}: IProps) => {
  const initialState: InitialUserState & {
    password: string;
  } = {
    id: "",
    name: "",
    email: "",
    role: USER_ROLE.IDLE,
    company: companies[0],
    password: "",
  };

  const [formData, setFormData] = React.useState(initialState);

  useEffect(() => {
    if (data) {
      setFormData({
        ...initialState,
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        company: data.company,
      });
    }
  }, [data]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleRoleChange = (role: string) => {
    setFormData({
      ...formData,
      role,
    });
  };

  const handleCompanyChange = (company: string) => {
    setFormData({
      ...formData,
      company,
    });
  };

  const handleSubmit = async () => {
    try {
      await api.createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        company: formData.company,
      });

      onClose();
      setFormData(initialState);

      toast({
        title: "New user added successfully.",
        description: format(
          new Date(),
          "EEEE, MMMM do, yyyy 'at' h:mm a"
        ),
        duration: 1500,
      });
    } catch (error) {
      console.error("Error adding user:", error);

      toast({
        title: "Unable to add user.",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
        duration: 3000,
      });
    }
  };

  const handleUpdate = async () => {
    /*
     * User update API will be added in a later step.
     * For now, prevent the old Firebase update operation.
     */
    console.log("User update will be migrated to FastAPI next.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md xl:max-w-fit">
        <DialogHeader>
          <DialogTitle>
            {type === MODAL_TYPE.EDIT
              ? "Edit User"
              : "Add User"}
          </DialogTitle>

          <DialogDescription>
            Create new user profiles by entering their details
            and assigning system access.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col w-full gap-2">
          <div className="flex items-center w-full gap-3">
            <Input
              placeholder="User Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  User Role
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>
                  User role
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuRadioGroup
                  value={formData.role}
                  onValueChange={handleRoleChange}
                >
                  <DropdownMenuRadioItem value={USER_ROLE.IDLE}>
                    {USER_ROLE.IDLE}
                  </DropdownMenuRadioItem>

                  <DropdownMenuRadioItem value={USER_ROLE.USER}>
                    {USER_ROLE.USER}
                  </DropdownMenuRadioItem>

                  <DropdownMenuRadioItem value={USER_ROLE.ADMIN}>
                    {USER_ROLE.ADMIN}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center w-full gap-3">
            <Input
              placeholder="User Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Company
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>
                  User company
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuRadioGroup
                  value={formData.company}
                  onValueChange={handleCompanyChange}
                >
                  {companies.map((company, index) => (
                    <DropdownMenuRadioItem
                      key={index}
                      value={company}
                    >
                      {formatName(company)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {type !== MODAL_TYPE.EDIT && (
            <Input
              placeholder="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              autoComplete="new-password"
            />
          )}
        </div>

        <DialogFooter className="sm:justify-start">
          {type === MODAL_TYPE.EDIT ? (
            <Button
              type="button"
              variant="default"
              className="ml-auto bg-blue-800 hover:bg-blue-700"
              onClick={handleUpdate}
            >
              Update
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              className="ml-auto bg-blue-800 hover:bg-blue-700"
              onClick={handleSubmit}
            >
              Add
            </Button>
          )}

          <DialogClose asChild>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};