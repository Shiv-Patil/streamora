import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { useState } from "react";
import api from "@/lib/axios-instance";
import { categories } from "@/lib/constants";

const categoryValues = categories.map((e) => e.value);

const formSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, "Title should be at least 10 characters")
    .max(100, "Title should not exceed 100 characters"),
  category: z.string().refine((e) => categoryValues.includes(e), {
    message: "Please select a category",
  }),
});

const StreamStartForm = ({ username }: { username?: string }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      return api.post("/stream/start", values);
    },
    onSuccess: () => {
      toast.success("Stream started successfully");
      form.reset();
      void queryClient.refetchQueries(["channel", username]);
    },
    onError: () => {
      toast.error("Failed to start stream");
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={() => void form.handleSubmit(onSubmit)()}
        className="space-y-8"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stream Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter your stream title" {...field} />
              </FormControl>
              <FormDescription>
                This will be the title of your stream.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="flex flex-col items-start">
              <FormLabel>Category</FormLabel>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "min-w-52 justify-between bg-transparent",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? categories.find(
                            (category) => category.value === field.value
                          )?.label || "Select category"
                        : "Select category"}
                      <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
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
                              form.setValue("category", category.value);
                              setPopoverOpen(false);
                              void form.trigger("category");
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                "mr-2 h-4 w-4",
                                category.value === field.value
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
              <FormDescription>
                Select the category that best describes your stream.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={mutation.isLoading}>
          {mutation.isLoading ? "Starting Stream..." : "Start Stream"}
        </Button>
      </form>
    </Form>
  );
};

export default StreamStartForm;
