
  import { AsyncLocalStorage } from 'async_hooks';

  type Store = {
    isScript: boolean;
  };

  export const scriptContext = new AsyncLocalStorage<Store>();
  