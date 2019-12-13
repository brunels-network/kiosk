
__all__ = ["DateRange"]


class DateRange:
    def __init__(self, start=None, end=None):
        self.state = {"start": start,
                      "end": end,
                      }

    def getStart(self):
        return self.state["start"]

    def getEnd(self):
        return self.state["end"]

    def __str__(self):
        start = self.getStart()
        end = self.getEnd()

        if start is None:
            if end is None:
                return "DateRange:unknown"
            else:
                return f"DateRange(from=? to={end.isoformat()})"
        elif end is None:
            return f"DateRange(from={start.isoformat()} to=?)"
        else:
            return f"DateRange(from={start.isoformat()} to={end.isoformat()})"

    def __repr__(self):
        return self.__str__()

    @staticmethod
    def null():
        return DateRange()

    def toDry(self):
        state = {}

        start = self.getStart()
        end = self.getEnd()

        if (start is None) and (end is None):
            return "null"

        if start == end:
            state["both"] = start.isoformat()
        else:
            if start:
                state["start"] = start.isoformat()

            if end:
                state["end"] = end.isoformat()

        return state
