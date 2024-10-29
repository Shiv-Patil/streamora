import EditableFieldSection from "@/components/EditableFieldSection";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios-instance";
import { z } from "zod";
import { toast } from "sonner";
import { LiveVideoPlayerProps } from "./LiveVideoPlayer";

const titleSchema = z
  .string()
  .trim()
  .min(10, "Title should be at least 10 characters")
  .max(100, "Title cannot exceed 100 characters");

const StreamOptions = ({
  title,
  username,
}: {
  title?: string;
  username: string;
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(title);

  const queryClient = useQueryClient();

  useEffect(() => {
    setTitleInput(title);
  }, [title]);

  const titleMutation = useMutation((newTitle: string) => {
    return api.post<string>("/stream/title", { title: newTitle });
  });

  const saveNewTitle = () => {
    const parsed = titleSchema.safeParse(titleInput);

    if (!parsed.success) {
      return toast.error(parsed.error.message);
    }

    titleMutation.mutate(parsed.data, {
      onSuccess: (res) => {
        queryClient.setQueryData<LiveVideoPlayerProps>(
          ["channel", username],
          (prev) => ({ ...prev, streamTitle: res.data })
        );
        setIsEditingTitle(false);
        toast.success("Saved successfully");
      },
      onError: () => {
        toast.error("Error updating bio");
      },
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500"></div>You are live.
      </div>
      <EditableFieldSection
        className="gap-1 p-0"
        title="Title"
        editButton={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setIsEditingTitle((prev) => !prev);
                setTitleInput(title);
              }}
              variant={"outline"}
              disabled={titleMutation.isLoading || !title}
            >
              {isEditingTitle ? "Cancel" : "Edit"}
            </Button>
            {isEditingTitle ? (
              <Button
                onClick={() => saveNewTitle()}
                disabled={titleInput === title || titleMutation.isLoading}
              >
                {titleMutation.isLoading ? <LoadingSpinner /> : "Save Changes"}
              </Button>
            ) : null}
          </div>
        }
      >
        <Input
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          disabled={!title || titleMutation.isLoading}
        />
      </EditableFieldSection>
    </>
  );
};

export default StreamOptions;
