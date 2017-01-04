export interface KeyName {
    keyName: string;
    keyDescription: string
}

export interface VisibleProperties {
    visibleProperties?: string[]
    hiddenProperties?: string[];
}

export interface PropertyGroups {
    propertyGroups?:{[name:string]:string[]}
}

export interface Label{
    label?: string | ((v:any)=>string)
}

export interface TreeProp{
    children?: string | string[]
}

export interface DefaultColumns{
    columns?: string[]
}

