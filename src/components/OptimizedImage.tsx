import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
}

export function OptimizedImage({ src, alt, className, fallback = "/placeholder.svg" }: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Lazy loading com Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setImageSrc(src);
              setIsLoading(false);
            };
            img.onerror = () => {
              setHasError(true);
              setIsLoading(false);
            };
            observer.disconnect();
          }
        });
      },
      { rootMargin: "50px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  if (isLoading) {
    return <Skeleton className={className} />;
  }

  if (hasError) {
    return <img src={fallback} alt={alt} className={className} />;
  }

  return <img ref={imgRef} src={imageSrc} alt={alt} className={className} loading="lazy" />;
}
