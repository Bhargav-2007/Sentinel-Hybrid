package in.gujarat.sentinel.model3.repository;

import in.gujarat.sentinel.model3.domain.VmsInstance;
import in.gujarat.sentinel.model3.domain.VmsVendorType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VmsInstanceRepository extends JpaRepository<VmsInstance, UUID> {
    List<VmsInstance> findByVendorType(VmsVendorType vendorType);
    List<VmsInstance> findByDistrict(String district);
}
