import getLinuxDistro from "linux-distro";

const linuxDistro = process.platform === "linux" && (await getLinuxDistro());

const fixElementaryOSTrayIcon = () => {
  if (String(linuxDistro.os).toLowerCase().includes("elementary"))
    process.env.XDG_CURRENT_DESKTOP = "Pantheon";
};

const fixes = [fixElementaryOSTrayIcon];

export const applyFixes = () => {
  fixes.forEach((fix) => fix());
};

export default applyFixes;
