"use client";
import LoginButton from "@/components/LoginButton";
// import LoginButton from "@/components/LoginButton";
import { SignedOut, UserButton } from "@clerk/nextjs";
import { User } from "lucide-react";

function HeaderProfileBtn() {
  return (
    <>
      <UserButton>
        {/* if we use only the UserButton component, the menu items will be "Manage Account and Sign Out" but we wanted to add the Profile option as well so we added the MenuItems component with the Link component inside and the options for the icon, link and label. */}
        <UserButton.MenuItems>
          <UserButton.Link
            label="Profile"
            labelIcon={<User className="size-4" />}
            href="/profile"
          />
        </UserButton.MenuItems>
      </UserButton>

      <SignedOut>
        {/* <SignInButton /> */}
        <LoginButton />
      </SignedOut>
    </>
  );
}
export default HeaderProfileBtn;
