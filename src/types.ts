export class TypeManager{}

export type TypeReference=Type|string

export interface Type{
    type?: (Type|string)[]
    id: string
    displayName?: string
}

export interface StringType extends Type{
    pattern?: string
    minLength?:string
    maxLength?: string
}

export interface ObjectType extends Type{
    properties?:{[name:string]:TypeReference}
}

export interface MapType extends Type{
    keyType?: TypeReference
    componentType?: TypeReference
}

export interface ArrayType extends Type{
    itemType?: TypeReference
    uniqueItems?: boolean
}


export const TYPE_STRING:StringType={id:"string"}
export const TYPE_NUMBER:Type={id:"number"}
export const TYPE_BOOLEAN:Type={id:"boolean"}
export const TYPE_OBJECT:ObjectType={id:"object"}
export const TYPE_ARRAY:ArrayType={id:"array"}
export const TYPE_MAP:MapType={id:"map"}