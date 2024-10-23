import api from "@/lib/axios-instance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./ui/spinner";
import useProfile from "@/hooks/Profile";

const EditAvatar = () => {
  const [file, setFile] = useState<File>();
  const [isFileValid, setIsFileValid] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: userProfile } = useProfile();

  const mutation = useMutation((file: File) => {
    const formData = new FormData();
    formData.append("profilePicture", file);
    return api.post<string>("/user/profile/profilePicture", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  });

  const handlePreviewLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      if (
        img.naturalHeight !== img.naturalWidth ||
        img.naturalWidth > 1024 ||
        img.naturalHeight > 1024 ||
        img.naturalHeight < 128 ||
        img.naturalWidth < 128
      ) {
        toast.error("Invalid image dimensions");
        setIsFileValid(false);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(undefined);
        }
      } else {
        setIsFileValid(true);
        img.classList.remove("hidden");
      }
      setIsPreviewLoading(false);
    },
    [setIsFileValid, setPreviewUrl, setIsPreviewLoading]
  );

  const handleImageError = useCallback(() => {
    setIsFileValid(false);
    if (previewUrl) {
      toast.error(
        "Failed to load image. The file might be corrupted or invalid."
      );
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(undefined);
    }
  }, [setIsFileValid, previewUrl, setPreviewUrl]);

  const handleUpload = useCallback(() => {
    if (!file || !isFileValid) return;
    mutation.mutate(file, {
      onSuccess: (res) => {
        queryClient.setQueryData(["profile"], {
          ...userProfile,
          profilePicture: res.data,
        });
        toast.success("Profile picture saved");
        setIsDialogOpen(false);
      },
      onError: (error) => {
        if (isAxiosError(error) && typeof error.response?.data === "object")
          toast.error(
            (error.response.data as { message: string }).message ||
              "Error updating profile picture"
          );
        else toast.error("Error updating profile picture");
      },
    });
  }, [file, isFileValid, mutation.mutate]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsPreviewLoading(true);
      setPreviewUrl(undefined);
      setIsFileValid(false);
      setTimeout(() => {
        if (!e.target.files || !e.target.files.length || !e.target.files[0])
          return;
        const file = e.target.files[0];
        if (file.size > 1024 * 1024 * 2)
          return toast.error("Max file upload size is 2MB.");
        setPreviewUrl(URL.createObjectURL(file));
        setFile(file);
      });
    },
    [setFile, setPreviewUrl]
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={(val) => setIsDialogOpen(val)}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit avatar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Your Avatar</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-dashed border-muted text-muted-foreground">
            {isPreviewLoading ? (
              <div
                className={cn(
                  "absolute -top-[4px] z-20 flex aspect-square h-[calc(100%+8px)] max-w-none items-center justify-center overflow-clip rounded-full",
                  previewUrl ? "bg-foreground/50" : ""
                )}
              >
                <LoadingSpinner className="text-primary-foreground" />
              </div>
            ) : !previewUrl ? (
              <span>
                Avatar
                <br />
                Preview
              </span>
            ) : null}

            <div className="absolute -top-[4px] aspect-square h-[calc(100%+8px)] max-w-none overflow-clip rounded-full">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="absolute hidden h-full w-full"
                  onLoad={handlePreviewLoad}
                  onError={handleImageError}
                />
              ) : null}
            </div>
          </div>
          <input
            id="profilePicture"
            accept="image/png, image/jpeg, .jpeg, .png"
            className="hidden"
            type="file"
            onChange={handleFileChange}
            disabled={isPreviewLoading || mutation.isLoading}
          />
          <label htmlFor="profilePicture">
            <Button
              disabled={isPreviewLoading || mutation.isLoading}
              variant="outline"
              onClick={(e) => e.currentTarget.parentElement?.click()}
            >
              Upload local image
            </Button>
          </label>
          <span className="text-sm">
            Must be JPEG or PNG, with a square aspect ratio. Resolution must be
            a minimum of 128x128px and a maximum of 3000x3000px and size cannot
            exceed 2MB.
          </span>
          <Button
            onClick={() => handleUpload()}
            disabled={mutation.isLoading || !isFileValid}
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditAvatar;
