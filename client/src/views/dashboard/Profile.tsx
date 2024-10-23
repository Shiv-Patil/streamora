import EditAvatar from "@/components/EditAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "@/components/UserAvatar";
import useProfile from "@/hooks/Profile";
import api from "@/lib/axios-instance";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { HTMLAttributes, useEffect, useState } from "react";
import { toast } from "sonner";

const ProfileSection = ({
  title,
  children,
  className,
  editButton,
  ...props
}: {
  title: string;
  children?: React.ReactNode;
  editButton?: React.ReactNode;
} & HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-card/50 p-4 shadow-md",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{title}</span>
        {editButton ?? null}
      </div>
      <Separator className="-ml-4 w-[calc(100%+2rem)]" />

      {children}
    </div>
  );
};

const Profile = () => {
  const { data: userProfile } = useProfile();
  const [usernameInput, setUsernameInput] = useState(userProfile.username);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(userProfile.bio);
  const queryClient = useQueryClient();

  useEffect(() => {
    setUsernameInput(userProfile.username);
    setBioInput(userProfile.bio);
  }, [userProfile]);

  const bioMutation = useMutation((newBio: string) => {
    return api.post<string>("/user/profile/bio", { bio: newBio });
  });

  const saveNewBio = () => {
    const newBio = bioInput.trim();
    if (newBio.length > 500)
      return toast.error("Bio cannot exceed 500 characters");
    bioMutation.mutate(newBio, {
      onSuccess: (res) => {
        queryClient.setQueryData(["profile"], {
          ...userProfile,
          bio: res.data,
        });
        setIsEditingBio(false);
        toast.success("Saved successfully");
      },
      onError: (error) => {
        if (isAxiosError(error) && typeof error.response?.data === "object")
          toast.error(
            (error.response.data as { message: string }).message ||
              "Error updating bio"
          );
        else toast.error("Error updating bio");
      },
    });
  };

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="flex w-full max-w-5xl flex-col gap-4 p-4 pl-0">
        <ProfileSection title="Profile">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <UserAvatar
                profilePicture={userProfile.profilePicture}
                className="h-16 w-16"
              />
              <EditAvatar />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-xl">{userProfile.username}</h4>
              <div className="flex items-center gap-2">
                {userProfile.followerCount}
                <span className="text-muted-foreground">Followers</span>
              </div>
            </div>
          </div>
        </ProfileSection>
        <ProfileSection title="Banner Image">
          <div className="relative aspect-[5/2] h-auto w-full max-w-xl self-center">
            <img
              className="absolute h-full w-full object-cover"
              src={userProfile.profileBanner}
            />
          </div>
        </ProfileSection>
        <ProfileSection title="Username">
          <Input
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            disabled
          />
        </ProfileSection>
        <ProfileSection
          title="Bio"
          editButton={
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsEditingBio((prev) => !prev)}
                variant={"outline"}
                disabled={bioMutation.isLoading}
              >
                {isEditingBio ? "Cancel" : "Edit"}
              </Button>
              {isEditingBio ? (
                <Button
                  onClick={() => saveNewBio()}
                  disabled={
                    bioInput === userProfile.bio || bioMutation.isLoading
                  }
                >
                  {bioMutation.isLoading ? <LoadingSpinner /> : "Save Changes"}
                </Button>
              ) : null}
            </div>
          }
        >
          <Textarea
            placeholder="Enter a description for the About panel on your channel page (Maximum 500 characters)"
            className="resize-y"
            value={bioInput}
            onChange={(e) => setBioInput(e.target.value)}
            disabled={!isEditingBio}
          />
        </ProfileSection>
      </div>
    </div>
  );
};

export default Profile;
