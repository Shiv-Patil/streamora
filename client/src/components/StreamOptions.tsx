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
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { categories } from "@/lib/constants";
import { cn } from "@/lib/utils";

const titleSchema = z
  .string()
  .trim()
  .min(10, "Title should be at least 10 characters")
  .max(100, "Title cannot exceed 100 characters");

const categoryValues = categories.map((e) => e.value);
const categorySchema = z.string().refine((e) => categoryValues.includes(e), {
  message: "Please select a valid category",
});

const StreamOptions = ({
  title,
  category,
  username,
  isConnected,
}: {
  title?: string;
  category?: string;
  username: string;
  isConnected: boolean;
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(title);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [categoryInput, setCategoryInput] = useState(category);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    setTitleInput(title);
  }, [title]);

  useEffect(() => {
    setCategoryInput(category);
  }, [category]);

  const titleMutation = useMutation((newTitle: string) => {
    return api.post<string>("/stream/title", { title: newTitle });
  });

  const categoryMutation = useMutation((newCategory: string) => {
    return api.post<string>("/stream/category", { category: newCategory });
  });

  const endStreamMutation = useMutation(() => {
    return api.post<undefined>("/stream/end");
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
        toast.error("Error updating title");
      },
    });
  };

  const saveNewCategory = () => {
    const parsed = categorySchema.safeParse(categoryInput);

    if (!parsed.success) {
      return toast.error(parsed.error.message);
    }

    categoryMutation.mutate(parsed.data, {
      onSuccess: (res) => {
        queryClient.setQueryData<LiveVideoPlayerProps>(
          ["channel", username],
          (prev) => ({ ...prev, streamCategory: res.data })
        );
        setIsEditingCategory(false);
        toast.success("Saved successfully");
      },
      onError: () => {
        toast.error("Error updating category");
      },
    });
  };

  const endStream = () => {
    endStreamMutation.mutate(undefined, {
      onSuccess: () => {
        void queryClient.refetchQueries(["channel", username]);
      },
      onError: () => {
        toast.error(
          isConnected
            ? "Please disconnect before ending stream"
            : "Error ending stream"
        );
      },
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        You are live.
      </div>

      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )}
        />
        {isConnected ? "Stream is connected" : "Stream is disconnected"}
      </div>

      {isConnected
        ? null
        : "Start streaming by connecting to the rtmp server using your stream key."}

      {/* Edit stream title */}
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

      {/* Edit stream category */}
      <EditableFieldSection
        className="gap-1 p-0"
        title="Title"
        editButton={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setIsEditingCategory((prev) => !prev);
                setCategoryInput(category);
              }}
              variant={"outline"}
              disabled={categoryMutation.isLoading || !category}
            >
              {isEditingCategory ? "Cancel" : "Edit"}
            </Button>
            {isEditingCategory ? (
              <Button
                onClick={() => saveNewCategory()}
                disabled={
                  categoryInput === category || categoryMutation.isLoading
                }
              >
                {titleMutation.isLoading ? <LoadingSpinner /> : "Save Category"}
              </Button>
            ) : null}
          </div>
        }
      >
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "min-w-52 justify-between bg-transparent",
                !categoryInput && "text-muted-foreground"
              )}
              disabled={!isEditingCategory}
            >
              {categoryInput
                ? categories.find(
                    (category) => category.value === categoryInput
                  )?.label || "Select category"
                : "Select category"}
              <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] bg-card p-0 shadow-2xl">
            <Command>
              <CommandInput placeholder="Search category..." />
              <CommandList>
                <CommandEmpty>No category found.</CommandEmpty>
                <CommandGroup>
                  {categories.map((category) => (
                    <CommandItem
                      value={category.label}
                      key={category.value}
                      onSelect={() => {
                        setCategoryInput(category.value);
                        setPopoverOpen(false);
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          "mr-2 h-4 w-4",
                          category.value === categoryInput
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {category.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </EditableFieldSection>
      <div className="flex-1" />
      <Button onClick={endStream} className="self-start">
        Stop streaming
      </Button>
    </>
  );
};

export default StreamOptions;
