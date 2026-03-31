import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button, buttonVariants } from "./button";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav aria-label="pagination" className={cn("flex w-full justify-center", className)} role="navigation" {...props} />
);

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul className={cn("flex flex-row items-center gap-1", className)} ref={ref} {...props} />
  )
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
  <li className={cn(className)} ref={ref} {...props} />
));
PaginationItem.displayName = "PaginationItem";

interface PaginationLinkProps extends React.ComponentProps<"button"> {
  isActive?: boolean;
}

const PaginationLink = ({
  className,
  isActive,
  type = "button",
  ...props
}: PaginationLinkProps) => (
  <button
    className={cn(
      buttonVariants({
        size: "icon",
        variant: isActive ? "default" : "outline"
      }),
      "h-9 w-9 rounded-xl text-sm",
      className
    )}
    type={type}
    {...props}
  />
);

const PaginationFirst = ({
  className,
  ...props
}: React.ComponentProps<typeof Button>) => (
  <Button className={cn("h-9 rounded-xl px-3 text-sm", className)} size={undefined} variant="outline" {...props}>
    <ChevronsLeft className="h-4 w-4" />
    <span className="hidden sm:inline">처음</span>
  </Button>
);

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof Button>) => (
  <Button className={cn("h-9 rounded-xl px-3 text-sm", className)} size={undefined} variant="outline" {...props}>
    <ChevronLeft className="h-4 w-4" />
    <span className="hidden sm:inline">이전</span>
  </Button>
);

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof Button>) => (
  <Button className={cn("h-9 rounded-xl px-3 text-sm", className)} size={undefined} variant="outline" {...props}>
    <span className="hidden sm:inline">다음</span>
    <ChevronRight className="h-4 w-4" />
  </Button>
);

const PaginationLast = ({
  className,
  ...props
}: React.ComponentProps<typeof Button>) => (
  <Button className={cn("h-9 rounded-xl px-3 text-sm", className)} size={undefined} variant="outline" {...props}>
    <span className="hidden sm:inline">마지막</span>
    <ChevronsRight className="h-4 w-4" />
  </Button>
);

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center text-muted-foreground", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
  </span>
);

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
};
