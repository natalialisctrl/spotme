import { FC, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters: {
    gender?: string;
    experienceLevel?: string;
    maxDistance: number;
    sameGymOnly: boolean;
  };
  onApplyFilters: (filters: any) => void;
}

const FilterModal: FC<FilterModalProps> = ({ 
  isOpen, 
  onClose, 
  initialFilters, 
  onApplyFilters 
}) => {
  const [gender, setGender] = useState<string | undefined>(initialFilters.gender);
  const [experienceLevel, setExperienceLevel] = useState<string | undefined>(initialFilters.experienceLevel);
  const [maxDistance, setMaxDistance] = useState<number>(initialFilters.maxDistance || 5);
  const [sameGymOnly, setSameGymOnly] = useState<boolean>(initialFilters.sameGymOnly || false);

  // Update local state when initial filters change
  useEffect(() => {
    setGender(initialFilters.gender);
    setExperienceLevel(initialFilters.experienceLevel);
    setMaxDistance(initialFilters.maxDistance || 5);
    setSameGymOnly(initialFilters.sameGymOnly || false);
  }, [initialFilters, isOpen]);

  const handleReset = () => {
    setGender(undefined);
    setExperienceLevel(undefined);
    setMaxDistance(5);
    setSameGymOnly(false);
  };

  const handleApply = () => {
    onApplyFilters({
      gender,
      experienceLevel,
      maxDistance,
      sameGymOnly
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium font-poppins text-gray-900">Filter Partners</DialogTitle>
        </DialogHeader>
        
        {/* Gender Filter */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Gender</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={gender === undefined ? "default" : "outline"}
              size="sm"
              onClick={() => setGender(undefined)}
            >
              All
            </Button>
            <Button
              variant={gender === "female" ? "default" : "outline"}
              size="sm"
              onClick={() => setGender("female")}
            >
              Women
            </Button>
            <Button
              variant={gender === "male" ? "default" : "outline"}
              size="sm"
              onClick={() => setGender("male")}
            >
              Men
            </Button>
            <Button
              variant={gender === "non-binary" ? "default" : "outline"}
              size="sm"
              onClick={() => setGender("non-binary")}
            >
              Non-binary
            </Button>
          </div>
        </div>
        
        {/* Experience Level Filter */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Experience Level</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={experienceLevel === undefined ? "default" : "outline"}
              size="sm"
              onClick={() => setExperienceLevel(undefined)}
            >
              All
            </Button>
            <Button
              variant={experienceLevel === "beginner" ? "default" : "outline"}
              size="sm"
              onClick={() => setExperienceLevel("beginner")}
            >
              Beginner
            </Button>
            <Button
              variant={experienceLevel === "intermediate" ? "default" : "outline"}
              size="sm"
              onClick={() => setExperienceLevel("intermediate")}
            >
              Intermediate
            </Button>
            <Button
              variant={experienceLevel === "advanced" ? "default" : "outline"}
              size="sm"
              onClick={() => setExperienceLevel("advanced")}
            >
              Advanced
            </Button>
          </div>
        </div>
        
        {/* Distance Range */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-gray-900">Distance (miles)</h4>
            <span className="text-sm text-gray-500">{maxDistance} miles</span>
          </div>
          <Slider
            value={[maxDistance]}
            min={1}
            max={25}
            step={1}
            onValueChange={(value) => setMaxDistance(value[0])}
          />
        </div>
        
        {/* Same Gym Only */}
        <div className="flex items-center mb-6">
          <Checkbox
            id="sameGymOnly"
            checked={sameGymOnly}
            onCheckedChange={(checked) => setSameGymOnly(checked as boolean)}
          />
          <Label htmlFor="sameGymOnly" className="ml-2 text-sm text-gray-900">
            Show only users at my gym
          </Label>
        </div>
        
        {/* Action Buttons */}
        <DialogFooter className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
          >
            Reset
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1"
          >
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FilterModal;
