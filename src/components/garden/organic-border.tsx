import { cn } from "@/lib/utils";

interface OrganicBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "subtle" | "pronounced";
}

export function OrganicBorder({ children, className, variant = "subtle", ...props }: OrganicBorderProps) {
  // Using an inline SVG as a mask for the container to give it rough, paper-like or leaf-like edges
  const maskImage = variant === "subtle" 
    ? `url("data:image/svg+xml,%3Csvg preserveAspectRatio='none' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1,1 Q40,0 60,2 T99,1 Q100,40 98,60 T99,99 Q60,100 40,98 T1,99 Q0,60 2,40 T1,1 Z' fill='black'/%3E%3C/svg%3E")`
    : `url("data:image/svg+xml,%3Csvg preserveAspectRatio='none' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2,2 C30,-1 70,3 98,2 C101,30 99,70 98,98 C70,101 30,99 2,98 C-1,70 3,30 2,2 Z' fill='black'/%3E%3C/svg%3E")`;

  return (
    <div 
      className={cn("relative overflow-hidden", className)} 
      style={{
        maskImage,
        WebkitMaskImage: maskImage,
        maskSize: '100% 100%',
        WebkitMaskSize: '100% 100%',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat'
      }}
      {...props}
    >
      {children}
    </div>
  );
}
