import BackeLandingReference from "@/components/BackeLandingReference";
import MaintenancePage from "@/components/MaintenancePage";
import { MAINTENANCE_MODE } from "@/config/maintenance";

const Index = () => {
  if (MAINTENANCE_MODE) {
    return <MaintenancePage />;
  }

  return <BackeLandingReference />;
};

export default Index;
