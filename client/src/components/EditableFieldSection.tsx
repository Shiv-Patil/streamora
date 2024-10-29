import { cn } from "@/lib/utils";
import { Separator } from "@radix-ui/react-separator";
import { HTMLAttributes } from "react";

const EditableFieldSection = ({
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
        "flex flex-col gap-4 rounded-xl bg-card p-4 shadow-md",
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

export default EditableFieldSection;
