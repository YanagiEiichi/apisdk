interface Config {
  [key: string]: any;
}

type Path = string;

interface SdkWithPath {
  [key: string]: SdkWithPath;
  <T = any>(): Promise<T>;
}

declare interface SdkClass {
  new(path?: Path, config?: Config): SdkWithPath;
}

declare const APISDK: SdkClass;

export default APISDK;