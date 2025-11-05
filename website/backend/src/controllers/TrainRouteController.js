// controllers/routeSreachController.js
import Train from "../models/TrainModel.js";
import dayjs from "dayjs";


// Helper to convert time string (HH:mm) and day to a Date object
function getDateTime(time, day, baseDate) {
  const [hour, minute] = time.split(":").map(Number);
  return dayjs(baseDate).add(day - 1, 'day').hour(hour).minute(minute).second(0);
}

// Direct Train Route Finder
export const getDirectTrain = async (req, res) => {
  try {
    const { from, to, date } = req.body;
    const travelDate = date ? dayjs(date) : dayjs();
    const dayIndex = travelDate.day(); // Sunday = 0, Monday = 1, ...

    const trains = await Train.find({
      RunningDays: { $regex: new RegExp(`^.{${dayIndex}}1`) },
    });

    const results = [];

    for (const train of trains) {
      const fromIndex = train.Stations.findIndex(s => s.StationCode === from);
      const toIndex = train.Stations.findIndex(s => s.StationCode === to);

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
        const departureTime = getDateTime(
          train.Stations[fromIndex].ScheduledDepartureTime,
          train.Stations[fromIndex].departureDay,
          travelDate
        );

        const arrivalTime = getDateTime(
          train.Stations[toIndex].ScheduledArrivalTime,
          train.Stations[toIndex].arrivalDay,
          travelDate
        );


        results.push({
          trainNumber: train.Number,
          trainName: train.Name,
          from,
          to,
          startTime: departureTime.toISOString(),
          endTime: arrivalTime.toISOString(),
        });
      }
    }

    res.json({ success: true, data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Indirect Train Route Finder
export const getIndirectTrains = async (req, res) => {
  try {
    const { from, to, date } = req.body;
    const travelDate = date ? dayjs(date) : dayjs();
    const dayIndex = travelDate.day();

    const trains = await Train.find({
      RunningDays: { $regex: new RegExp(`^.{${dayIndex}}1`) },
    });

    const indirectRoutes = [];

    for (const train1 of trains) {
      const fromIndex = train1.Stations.findIndex(s => s.StationCode === from);
      if (fromIndex === -1) continue;

      for (const midStation of train1.Stations.slice(fromIndex + 1)) {
        const midCode = midStation.StationCode;

        for (const train2 of trains) {
          if (train1.Number === train2.Number) continue;

          const midIndex2 = train2.Stations.findIndex(s => s.StationCode === midCode);
          const toIndex = train2.Stations.findIndex(s => s.StationCode === to);

          if (midIndex2 !== -1 && toIndex !== -1 && midIndex2 < toIndex) {
            const arrivalMid = getDateTime(
              midStation.ScheduledArrivalTime,
              midStation.arrivalDay,
              travelDate
            );

            const departMid = getDateTime(
              train2.Stations[midIndex2].ScheduledDepartureTime,
              train2.Stations[midIndex2].departureDay,
              travelDate
            );

            const fromTime = getDateTime(
              train1.Stations[fromIndex].ScheduledDepartureTime,
              train1.Stations[fromIndex].departureDay,
              travelDate
            );

            const toTime = getDateTime(
              train2.Stations[toIndex].ScheduledArrivalTime,
              train2.Stations[toIndex].arrivalDay,
              travelDate
            );

            const totalDurationMinutes = toTime.diff(fromTime, 'minute');
            const waitMinutes = departMid.diff(arrivalMid, 'minute');

            if (waitMinutes >= 5 && waitMinutes <= 0.4 * totalDurationMinutes) {
              indirectRoutes.push({
                firstTrain: train1.Number,
                secondTrain: train2.Number,
                via: midCode,
                from,
                to,
                startTime: fromTime.toISOString(),
                endTime: toTime.toISOString(),
              });
            }
          }
        }
      }
    }

    res.json({ success: true, data: indirectRoutes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
