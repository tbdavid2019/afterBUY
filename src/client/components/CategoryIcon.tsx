import React from 'react';
import {
  Bath,
  Utensils,
  Sparkles,
  Pill,
  Tv,
  Laptop,
  Shirt,
  Package,
  LucideProps,
} from 'lucide-react';
import { ItemCategory } from '../../shared/types.ts';

interface CategoryIconProps extends LucideProps {
  category: ItemCategory | string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, ...props }) => {
  switch (category) {
    case 'bathroom':
      return <Bath {...props} />;
    case 'kitchen':
      return <Utensils {...props} />;
    case 'skincare':
      return <Sparkles {...props} />;
    case 'medicine':
      return <Pill {...props} />;
    case 'appliances':
      return <Tv {...props} />;
    case 'electronics':
      return <Laptop {...props} />;
    case 'clothing':
      return <Shirt {...props} />;
    case 'general':
    default:
      return <Package {...props} />;
  }
};
