export const useActiveNavigation = () => {
  const route = useRoute();
  const normalizePath = (path: string) => path.split("#")[0]?.split("?")[0] || "/";

  const isActiveNavigation = (href: string) => {
    const currentPath = normalizePath(route.path);
    const targetPath = normalizePath(href);

    if (targetPath === "/") {
      return currentPath === "/";
    }

    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
  };

  return {
    isActiveNavigation,
  };
};
