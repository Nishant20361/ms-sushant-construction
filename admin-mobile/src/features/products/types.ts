export interface Category {id:number;name:string;slug:string;imageUrl:string|null;displayOrder:number;isActive:boolean;productCount?:number}
export interface ProductImage {id:number;url:string;alt:string|null;isPrimary:boolean}
export interface Product {id:number;name:string;description:string|null;unit:string;price:number;mrp:number;stock:number;isActive:boolean;categoryId:number;category:{id:number;name:string;slug:string}|null;imageUrl:string|null;images:ProductImage[];createdAt:string;updatedAt:string}
export interface ProductFilters {search:string;categoryId:number|0;active:""|"true"|"false"}
export interface ProductPage {products:Product[];total:number;page:number;pages:number}
export interface ProductPayload {name:string;description:string;unit:string;price:number;mrp:number;stock:number;categoryId:number;isActive:boolean;imageUrl:string|null}
export interface CategoryPayload {name:string;slug?:string;imageUrl:string|null;displayOrder:number;isActive:boolean}
export interface LocalImage {uri:string;mimeType:string;fileName:string}
