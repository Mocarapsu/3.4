import { Scissors } from 'lucide-react';

/**
 * Pantalla de carga global.
 * Analogia PHP: Es como mostrar un "Cargando..." mientras
 * verificas la sesion del usuario antes de renderizar la pagina.
 */
export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4 animate-pulse">
          <Scissors className="w-8 h-8 text-primary" />
        </div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}
