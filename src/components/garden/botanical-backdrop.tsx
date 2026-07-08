import { cn } from "@/lib/utils";
import { EngravedBranch, WatermarkFlower } from "./botanical-svgs";

interface BotanicalBackdropProps {
  className?: string;
  variant?: "hero" | "section" | "footer";
}

export function BotanicalBackdrop({ className, variant = "section" }: BotanicalBackdropProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none z-0 mix-blend-multiply", className)} aria-hidden="true">
      {variant === "hero" && (
        <>
          <div className="absolute -top-[10%] -left-[5%] w-[60%] sm:w-[40%] opacity-20 animate-breathe">
            <EngravedBranch className="w-full h-auto text-forest" />
          </div>
          <div className="absolute top-[20%] -right-[10%] w-[70%] sm:w-[50%] opacity-15 rotate-180 animate-sway-slow">
            <EngravedBranch className="w-full h-auto text-sage" />
          </div>
          <div className="absolute bottom-[5%] left-[20%] w-[40%] sm:w-[30%] opacity-10">
            <WatermarkFlower className="w-full h-auto text-moss" />
          </div>
        </>
      )}

      {variant === "section" && (
        <>
          <div className="absolute top-0 right-[5%] w-[40%] sm:w-[25%] opacity-[0.08] -scale-x-100">
            <EngravedBranch className="w-full h-auto text-forest" />
          </div>
          <div className="absolute bottom-0 left-[2%] w-[35%] sm:w-[20%] opacity-[0.06]">
            <EngravedBranch className="w-full h-auto text-sage" />
          </div>
        </>
      )}

      {variant === "footer" && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-full opacity-15 flex justify-between items-end">
             <EngravedBranch className="w-1/3 h-auto text-moss origin-bottom-left -rotate-12" />
             <WatermarkFlower className="w-1/4 h-auto text-forest mb-[-10%]" />
             <EngravedBranch className="w-1/3 h-auto text-moss origin-bottom-right rotate-12 -scale-x-100" />
          </div>
        </>
      )}
    </div>
  );
}
