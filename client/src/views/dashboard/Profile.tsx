import EditAvatar from "@/components/EditAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "@/components/UserAvatar";
import useProfile, { type Profile } from "@/hooks/Profile";
import api from "@/lib/axios-instance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import defaultProfileBanner from "@/assets/banner.png";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";
import EditableFieldSection from "@/components/EditableFieldSection";
import { z } from "zod";

const bioSchema = z
  .string()
  .trim()
  .min(0)
  .max(500, "Bio cannot exceed 500 characters");

const Profile = () => {
  const { data: userProfile, isError } = useProfile();
  const [usernameInput, setUsernameInput] = useState(userProfile?.username);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(userProfile?.bio);
  const queryClient = useQueryClient();

  useEffect(() => {
    setUsernameInput(userProfile?.username);
    setBioInput(userProfile?.bio);
  }, [userProfile]);

  const bioMutation = useMutation((newBio: string) => {
    return api.post<string>("/user/profile/bio", { bio: newBio });
  });

  const saveNewBio = () => {
    const parsed = bioSchema.safeParse(bioInput);

    if (!parsed.success) {
      return toast.error(parsed.error.message);
    }

    bioMutation.mutate(parsed.data, {
      onSuccess: (res) => {
        queryClient.setQueryData<Profile>(["profile"], (prev) =>
          prev
            ? {
                ...prev,
                bio: res.data,
              }
            : undefined
        );
        setIsEditingBio(false);
        toast.success("Saved successfully");
      },
      onError: () => {
        toast.error("Error updating bio");
      },
    });
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      {!isError ? (
        <>
          <div className="flex w-full max-w-5xl flex-col gap-4 p-4 pl-0">
            <EditableFieldSection title="Profile">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <UserAvatar
                    profilePicture={userProfile?.profilePicture}
                    className="h-16 w-16"
                  />
                  <EditAvatar />
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="text-xl">{userProfile?.username}</h4>
                  {userProfile ? (
                    <div className="flex items-center gap-2">
                      {userProfile.followerCount}
                      <span className="text-muted-foreground">Followers</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </EditableFieldSection>
            <EditableFieldSection title="Banner Image">
              <div className="relative aspect-[5/2] h-auto w-full max-w-xl self-center">
                {userProfile ? (
                  <img
                    className="absolute h-full w-full object-cover"
                    src={userProfile?.profileBanner ?? defaultProfileBanner}
                  />
                ) : (
                  <Skeleton className="absolute h-full w-full" />
                )}
              </div>
            </EditableFieldSection>
            <EditableFieldSection title="Username">
              <Input
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                disabled
              />
            </EditableFieldSection>
            <EditableFieldSection
              title="Bio"
              editButton={
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsEditingBio((prev) => !prev)}
                    variant={"outline"}
                    disabled={bioMutation.isLoading || !userProfile}
                  >
                    {isEditingBio ? "Cancel" : "Edit"}
                  </Button>
                  {isEditingBio ? (
                    <Button
                      onClick={() => saveNewBio()}
                      disabled={
                        bioInput === userProfile?.bio || bioMutation.isLoading
                      }
                    >
                      {bioMutation.isLoading ? (
                        <LoadingSpinner />
                      ) : (
                        "Save Changes"
                      )}
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
            </EditableFieldSection>
          </div>
        </>
      ) : (
        <>
          <ExclamationCircleIcon /> An error occurred
        </>
      )}
    </div>
  );
};

export default Profile;
