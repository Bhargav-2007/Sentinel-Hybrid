package in.gujarat.sentinel.model3.repository;

import in.gujarat.sentinel.model3.domain.FederatedCamera;
import in.gujarat.sentinel.model3.domain.VmsInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FederatedCameraRepository extends JpaRepository<FederatedCamera, UUID> {
    List<FederatedCamera> findByVmsInstance(VmsInstance vms);
    Optional<FederatedCamera> findByVmsInstanceAndVendorCameraId(VmsInstance vms, String vendorCameraId);
    Optional<FederatedCamera> findBySentinelCameraId(String sentinelCameraId);
    List<FederatedCamera> findByIsOnlineTrue();
    long countByVmsInstance(VmsInstance vms);
}
