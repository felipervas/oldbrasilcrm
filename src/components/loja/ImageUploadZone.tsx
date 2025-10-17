import { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';

interface ImageUploadZoneProps {
  images: Array<{ url: string; ordem: number; id?: string }>;
  onUpload: (files: File[]) => void;
  onRemove: (index: number) => void;
  onReorder?: (images: Array<{ url: string; ordem: number; id?: string }>) => void;
  maxImages?: number;
}

export const ImageUploadZone = ({ 
  images, 
  onUpload, 
  onRemove,
  onReorder,
  maxImages = 5 
}: ImageUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const compressImages = async (files: File[]): Promise<File[]> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };

    try {
      const compressedFiles = await Promise.all(
        files.map(file => imageCompression(file, options))
      );
      return compressedFiles;
    } catch (error) {
      console.error('Erro ao comprimir imagens:', error);
      return files; // Retorna arquivos originais se falhar
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      setIsCompressing(true);
      const compressedFiles = await compressImages(files);
      onUpload(compressedFiles);
      setIsCompressing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setIsCompressing(true);
      const compressedFiles = await compressImages(files);
      onUpload(compressedFiles);
      setIsCompressing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Grid de imagens existentes */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={image.url}
                alt={`Imagem ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => onRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute top-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zona de upload */}
      {images.length < maxImages && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            isDragging ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"
          )}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            {isCompressing ? (
              <>
                <Upload className="h-12 w-12 text-primary animate-pulse" />
                <p className="font-medium text-primary">
                  Comprimindo imagens...
                </p>
              </>
            ) : isDragging ? (
              <Upload className="h-12 w-12 text-primary animate-bounce" />
            ) : (
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            )}
            {!isCompressing && (
              <div>
                <p className="font-medium">
                  Arraste imagens aqui
                </p>
                <p className="text-sm text-muted-foreground">
                  ou clique para selecionar
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {images.length}/{maxImages} imagens
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
