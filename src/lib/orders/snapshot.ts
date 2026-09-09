import type { AssemblyPlan } from '@/lib/cart-pricing';
import type { PriceLine } from '@/lib/pricing';

/**
 * Ce qui est figé dans `OrderItem.snapshot` au moment de la commande : le
 * catalogue peut changer après coup, l'admin doit toujours voir exactement
 * ce qui a été vendu et facturé ce jour-là.
 */
export interface OrderItemSnapshot {
  kind: 'STANDARD' | 'CUSTOM_BUILD';
  label: string;
  sku: string;
  /** Nomenclature agrégée, pour commander les pièces. */
  bom?: readonly PriceLine[];
  /** Plan de montage position par position, pour assembler. */
  assemblyPlan?: AssemblyPlan;
  layoutName?: string;
}
