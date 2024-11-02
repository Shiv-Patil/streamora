import EditAvatar from "@/components/EditAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import ImageWithFallback from "@/components/ImageWithFallback";
import useProfile, { type Profile } from "@/hooks/Profile";
import api from "@/lib/axios-instance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import defaultProfileBanner from "@/assets/banner.png";
import { Skeleton } from "@/components/ui/skeleton";
import EditableFieldSection from "@/components/EditableFieldSection";
import { z } from "zod";
import { isAxiosError } from "axios";
import useChannel from "@/hooks/Channel";

const sanitizeUsername = (input: string, replacement = "_"): string => {
  let sanitized = input.trim().toLowerCase();
  sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, replacement);
  sanitized = sanitized.substring(0, 69);
  return sanitized;
};

const usernameSchema = z
  .string()
  .min(1)
  .max(69)
  .refine(
    (arg) => arg === sanitizeUsername(arg),
    "Only lowercase letters, numbers, underscores, and dashes are allowed"
  );

const bioSchema = z
  .string()
  .trim()
  .min(0)
  .max(500, "Bio cannot exceed 500 characters");

const Profile = () => {
  const { data: userProfile } = useProfile();
  const { data: channel } = useChannel(userProfile?.username);

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(
    userProfile?.username || ""
  );
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(userProfile?.bio || "");
  const queryClient = useQueryClient();

  useEffect(() => {
    setUsernameInput(userProfile?.username || "");
    setBioInput(userProfile?.bio || "");
  }, [userProfile]);

  const usernameMutation = useMutation((newUsername: string) => {
    return api.post<string>("/user/profile/username", {
      username: newUsername,
    });
  });

  const bioMutation = useMutation((newBio: string) => {
    return api.post<string>("/user/profile/bio", { bio: newBio });
  });

  const saveUsername = () => {
    const parsed = usernameSchema.safeParse(usernameInput);

    if (!parsed.success) {
      return toast.error(parsed.error.errors[0].message);
    }

    usernameMutation.mutate(parsed.data, {
      onSuccess: (res) => {
        void queryClient.invalidateQueries(["channel", userProfile?.username]);
        queryClient.setQueryData<Profile>(["profile"], (prev) =>
          prev
            ? {
                ...prev,
                username: res.data,
              }
            : undefined
        );
        setIsEditingUsername(false);
        toast.success("Saved successfully");
      },
      onError: (err) => {
        if (isAxiosError(err))
          if (
            (err.response?.data as { message: string }).message ===
            "Username already exists"
          )
            return toast.error("Username already exists");
        toast.error("Error updating username");
      },
    });
  };

  const saveNewBio = () => {
    const parsed = bioSchema.safeParse(bioInput);

    if (!parsed.success) {
      return toast.error(parsed.error.errors[0].message);
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
      <div className="flex w-full max-w-5xl flex-col gap-4 p-4 pl-0">
        <EditableFieldSection title="Profile">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <ImageWithFallback
                src={userProfile?.profilePicture}
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
        <EditableFieldSection
          title="Username"
          editButton={
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsEditingUsername((prev) => !prev)}
                variant={"outline"}
                disabled={
                  channel?.isLive || usernameMutation.isLoading || !userProfile
                }
              >
                {isEditingUsername ? "Cancel" : "Edit"}
              </Button>
              {isEditingUsername ? (
                <Button
                  onClick={() => saveUsername()}
                  disabled={
                    usernameInput === userProfile?.username ||
                    usernameMutation.isLoading
                  }
                >
                  {usernameMutation.isLoading ? (
                    <LoadingSpinner />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              ) : null}
            </div>
          }
        >
          <Input
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            disabled={!isEditingUsername}
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
        </EditableFieldSection>
      </div>
    </div>
  );
};

export default Profile;
